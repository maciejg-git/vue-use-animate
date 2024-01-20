let remap = (v, range) => (v * (range[1] - range[0])) / 1 + range[0];
let clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
let steps = (t, s) =>
  Math.ceil(Math.min(Math.max(t, 0.000001), 1) * s) * (1 / s);
let promise = (i) => new Promise((res) => (i.resolve = res));

let getDefaultTrack = (animation, index) => {
  return {
    startTime: 0,
  timeFraction: 0,
  progress: 0,
    frameIndex: 0,
    trackIndex: index,
  reverse: false,
    cycles: 0,
    elapsed: 0,
    frame: animation._frames[index][0],
    _nextFrame: false,
    _trackComplete: false,
  _isAllComplete: true,
    _frames: animation._frames,
    _store: {},
  next() {
    this._nextFrame = true;
  },
    isAllComplete() {
      return this._isAllComplete
    },
  isComplete() {
    return (
      ((this.reverse || this.frame.reverse) && this.timeFraction === 0) ||
      (!this.reverse && !this.frame.reverse && this.timeFraction === 1)
    );
  },
  getTimeFraction(offset = 0) {
    let timeFraction =
      (this.elapsed - offset - this.frame.delay) / this.frame.duration;
    timeFraction = clamp(timeFraction);
    if (this.reverse || this.frame.reverse) timeFraction = 1 - timeFraction;
    return timeFraction;
  },
  update(offset = 0) {
    this.timeFraction = this.getTimeFraction(offset);
    this.progress = this.getProgress();

    this._isAllComplete = !this.isComplete() ? false : this._isAllComplete
  },
  getProgress() {
    let progress = this.timeFraction
    if (this.timing) progress = this.timing(this.timeFraction)
    else if (this.frame.timing) progress = this.frame.timing(this.timeFraction)
    if (this.remap) progress = remap(progress, this.remap)
    else if (this.frame.remap) progress = remap(progress, this.frame.remap)
    return progress;
  },
    setTiming(timing) {
      this.timing = timing
    },
    setRemap(remap) {
      this.remap = remap
    },
    setReverse(reverse) {
      this.reverse = reverse
    }
  }
}

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
    animations.forEach((animation, i) => {
      cancelAnimationFrame(animation.reqId);
      animation._tracks.forEach((t, index, arr) => {
        arr[index] = getDefaultTrack(animation, index)
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
        // i.repeat = i.repeat === true ? 9999999 : +i.repeat;
        if (Array.isArray(i?.frames)) {
          i._frames = i.frames.map((t) => {
            return t.map((f) => {
              return {
                duration: f.duration ?? 0,
                timing: f.timing ?? i.timing ?? ((i) => i),
                remap: f.remap ?? i.remap ?? null,
                reverse: f.reverse ?? false,
                repeat: f.repeat ?? false,
                delay: f.delay ?? 0,
              }
            })
          })
          i._tracks = Array.from({length: i._frames.length})
          i._tracks = i._tracks.map((t, index) => getDefaultTrack(i, index))
        }
        return i;
      });
    animations.forEach((i) => i.draw(i._tracks))
  };

  let destroy = () => stop();

  let setFrame = (track, index) => {
    track.frameIndex = index
    track.startTime = 0
    track.frame = track._frames[track.trackIndex][index]
  }

  let animate = (animation) => {
    let { _tracks, _frames, _isAlternate, _isReverse } = animation;

    let step = (time) => {
      let continueAnimation = false;
      time -= pausedOffset;
      for (let track of _tracks) {
      if (track._trackComplete) continue
        if (!track.startTime) track.startTime = time
      track.elapsed = time - track.startTime;

      track._isAllComplete = true
      }

        animation.draw(_tracks);

      for (let track of _tracks) {
        if (track._trackComplete) continue
        if (!track._nextFrame) {
          continueAnimation = true
          continue
        }
        track._nextFrame = false
        if (track.frameIndex + 1 <  _frames[track.trackIndex].length) {
          setFrame(track, track.frameIndex + 1)
          continueAnimation = true
        } else {
          if (animation.repeat) {
            setFrame(track, 0)
            track.cycles++
            if (_isAlternate) {
              track.reverse = (track.cycles + _isReverse) % 2;
            }
            continueAnimation = true
          } else {
            track._trackComplete = true
          }
          if (animation.afterTrack) animation.afterTrack(state)
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
