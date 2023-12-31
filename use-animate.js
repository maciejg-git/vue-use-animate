let remap = (v, range) => (v * (range[1] - range[0])) / 1 + range[0];
let clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
let steps = (t, s) =>
  Math.ceil(Math.min(Math.max(t, 0.000001), 1) * s) * (1 / s);
let promise = (i) => new Promise((res) => (i.resolve = res));

let defaultTrack = {
  startTime: 0,
  frameIndex: 0,
  reverse: false,
  cycles: 0,
  elapsed: 0,
  _nextFrame: false,
  _trackComplete: false,
  _isFrameComplete: true,
  next() {
    this._nextFrame = true;
  },
}

let defaultState = {
  timeFraction: 0,
  progress: 0,
  frameIndex: 0,
  track: null,
  frame: null,
  remap: null,
  _trackComplete: false,
  _isAllComplete: true,
  isComplete() {
    return (
      ((this.reverse || this.frame.reverse) && this.timeFraction === 0) ||
      (!this.reverse && !this.frame.reverse && this.timeFraction === 1)
    );
  },
  isAllComplete() {
    return this._isAllComplete
  },
  isAllTrackComplete(track) {
    return track !== undefined ? this._tracks[track]._isFrameComplete : this.track._isFrameComplete
  },
  getTimeFraction(offset = 0) {
    // if (offset < 0) offset = 0;
    let timeFraction =
      (this.track.elapsed - offset - this.frame.delay) / this.frame.duration;
    timeFraction = clamp(timeFraction);
    if (this.reverse || this.frame.reverse) timeFraction = 1 - timeFraction;
    return timeFraction;
  },
  update(track, offset = 0) {
    this.track = this._tracks[track]
    this.frameIndex = this._tracks[track].frameIndex
    this.frame = this._frames[track][this.frameIndex]

    this.timeFraction = this.getTimeFraction(offset);
    this.progress = this.getProgress();

    this.track._isFrameComplete = !this.isComplete() ? false : this.track._isFrameComplete
    this._isAllComplete = !this.isComplete() ? false : this._isAllComplete
  },
  next(track) {
    this._tracks[track].next()
  },
  setTiming(timing) {
    this.timing = timing;
  },
  setRemap(remap) {
    this.remap = remap
  },
  getProgress() {
    let progress = this.timeFraction;
    if (this.timing) progress = this.timing(this.timeFraction)
    else if (this.frame.timing) progress = this.frame.timing(this.timeFraction)
    if (this.remap) progress = remap(progress, this.remap)
    else if (this.frame.remap) progress = remap(progress, this.frame.remap)
    return progress;
  },
};

export default function useAnimate() {
  let state = "stop";
  let animations = [];
  let pausedOffset = 0;
  let pausedAt = 0;

  let play = (index, update) => {
    if (state === "play") return;
    if (pausedAt) pausedOffset += performance.now() - pausedAt;
    state = "play";
    animate(animations[index], update);
    return promise(animations[index]);
  };

  let stop = () => {
    state = "stop";
    animations.forEach((animation) => {
      cancelAnimationFrame(animation.reqId);
      animation._tracks.forEach((t, index, arr) => {
        arr[index] = { ...defaultTrack, trackIndex: index, reverse: animation._isReverse }
      })
    });
  };

  let pause = () => {
    if (state === "pause" || state === "stop") return;
    state = "pause";
    pausedAt = performance.now();
    animations.forEach((animation) => cancelAnimationFrame(animation.reqId));
  };

  let set = (animation) => {
    animations = (Array.isArray(animation) ? [...animation] : [animation])
      .map((i) => {
        return { ...i };
      })
      .map((i) => {
        i._isAlternate =
          i.direction === "alternate" || i.direction === "alternate-reverse";
        i._isReverse =
          i.direction === "reverse" || i.direction === "alternate-reverse";
        i.repeat = i.repeat === true ? 9999999 : +i.repeat;
        if (Array.isArray(i?.frames)) {
        i._frames = i.frames.map((t) => {
          return t.map((f) => {
          if (!f.duration) f.duration = 0;
          if (!f.timing) f.timing = i.timing ?? ((i) => i);
          if (!f.remap) f.remap = i.remap ?? null;
          if (!f.reverse) f.reverse = false;
          if (!f.delay) f.delay = 0;
          return f;
        })
        });
        i._tracks = Array.from({ length: i._frames.length }).map((t, index) => {
          t = { ...defaultTrack, trackIndex: index, reverse: i._isReverse };
          return t
        })
        }
        i.state = { ...defaultState, _tracks: i._tracks, _frames: i._frames }
        return i;
      });
  };

  let destroy = () => stop();

  let animate = (animation) => {
    let { state, _frames, _tracks, _isAlternate, _isReverse } = animation;

    let step = (time) => {
      let continueAnimation = false;
      time -= pausedOffset;
      for (let track of _tracks) {
      if (state._trackComplete) continue
        if (!track.startTime) track.startTime = time
      track.elapsed = time - track.startTime;

      state._isAllComplete = true
      track._isFrameComplete = true
      }
        animation.draw(state);

      for (let track of _tracks) {
        if (track._trackComplete) continue
      if (!track._nextFrame) {
        continueAnimation = true
        continue
      }
        track._nextFrame = false;
        // if (animation.afterFrame) animation.afterFrame(state.frameIndex, state);
        if (animation.afterFrame) animation.afterFrame(state);
        if (track.frameIndex + 1 < _frames[track.trackIndex].length) {
          track.frameIndex++
          track.startTime = time
          continueAnimation = true;
        } else {
          if (animation.repeat) {
            track.frameIndex = 0;
            track.startTime = time
            track.cycles++;
            if (_isAlternate) {
              track.reverse = (track.cycles + _isReverse) % 2;
            }
            continueAnimation = true;
          } else {
            track._trackComplete = true
          }
        }
      }

      if (continueAnimation) animation.reqId = requestAnimationFrame(step);
      else if (animation.finished) animation.finished();
    }
    animation.reqId = requestAnimationFrame(step);
  };

  return {
    play,
    stop,
    pause,
    set,
    destroy,
    steps,
  };
}
