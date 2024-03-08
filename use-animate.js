let remap = (v, range) => (v * (range[1] - range[0])) / 1 + range[0];
let clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
let steps = (t, s) =>
  Math.ceil(Math.min(Math.max(t, 0.000001), 1) * s) * (1 / s);
let getRandomInt = (min, max) => Math.random() * (max - min) + min 

let defaultAnimationEvents = {
  initialDraw: false,
  animationStarted: false,
};

let defaultTrackEvents = {
  frameStarted: false,
  trackStarted: false,
};

let getDefaultTrack = (frames, index) => {
  return {
    startTime: 0,
    elapsed: 0,
    timeFraction: 0,
    _timeFraction: 0,
    progress: 0,
    frameIndex: 0,
    trackIndex: index,
    reverse: null,
    cycles: 0,
    frame: frames[index][0],
    _nextFrame: false,
    _repeatFrame: false,
    _trackComplete: false,
    _isAllComplete: false,
    _frames: frames[index],
    ...defaultTrackEvents,
    next() {
      this._nextFrame = true;
    },
    repeat() {
      this._repeatFrame = true;
    },
    isAllComplete() {
      return this._isAllComplete;
    },
    isComplete() {
      return (
        ((this.reverse || this.frame._reverse) && this.timeFraction === 0) ||
        (!this.reverse && !this.frame._reverse && this.timeFraction === 1)
      );
    },
    getTimeFraction(offset = 0) {
      let timeFraction =
        (this.elapsed - offset - this.frame.delay) / this.frame.duration;
      timeFraction = clamp(timeFraction);
      this._timeFraction = timeFraction
      if (this.reverse ?? this.frame._reverse) timeFraction = 1 - timeFraction;
      return timeFraction;
    },
    update(offset = 0) {
      this.timeFraction = this.getTimeFraction(offset);
      this.progress = this.getProgress();

      this._isAllComplete = !this.isComplete() ? false : this._isAllComplete;

      return this;
    },
    getProgress() {
      let progress = this.timeFraction;

      if (this.timing) {
        progress = this.timing(this._timeFraction);
        if (this.reverse ?? this.frame._reverse) progress = 1 - progress;
      } else if (this.frame.timing) {
        progress = this.frame.timing(this._timeFraction);
        if (this.reverse ?? this.frame._reverse) progress = 1 - progress;
      }

      if (this.remap) progress = remap(progress, this.remap);
      else if (this.frame.remap) progress = remap(progress, this.frame.remap);

      return progress;
    },
    setTiming(timing) {
      this.timing = timing;
      return this;
    },
    setRemap(remap) {
      this.remap = remap;
      return this;
    },
    setReverse(reverse) {
      this.reverse = reverse;
      return this;
    },
  };
};

export default function useAnimate() {
  let state = "stop";
  let pausedOffset = 0;
  let pausedAt = 0;
  let _frames = [];
  let _tracks = [];
  let repeat = false;
  let timing = null;
  let draw = null;
  let reqId = null;
  let animationEvents = { ...defaultAnimationEvents };

  let play = () => {
    if (state === "play") return;
    if (pausedAt) pausedOffset += performance.now() - pausedAt;
    state = "play";
    animationEvents.animationStarted = true;
    _tracks.forEach((t) => {
      t.trackStarted = true;
      t.frameStarted = true;
    });
    reqId = requestAnimationFrame(step);
  };

  let stop = () => {
    state = "stop";
    cancelAnimationFrame(reqId)
    _tracks.forEach((t, index, arr) => {
      arr[index] = getDefaultTrack(_frames, index)
      arr[index]._frames.forEach((frame) => {
        frame.cycles = 0
        frame._reverse = frame.isReverse
      })
    })
  };

  let restart = () => {
    if (state !== "stop") stop()
    play()
  }

  let pause = () => {
    if (state === "pause" || state === "stop") return;
    state = "pause";
    pausedAt = performance.now();
    cancelAnimationFrame(reqId);
  };

  let set = (animation) => {
    if (Array.isArray(animation.frames)) {
      _frames = animation.frames.map((t) => {
        return t.map((f) => {
          return {
            duration: f.duration ?? 0,
            timing: f.timing ?? animation.timing ?? ((i) => i),
            remap: f.remap ?? animation.remap ?? null,
            isReverse: f.reverse ?? false,
            isAlternate: f.alternate ?? false,
            delay: f.delay ?? 0,
            _reverse: f.reverse ?? false,
            cycles: 0,
          };
        });
      });
      _tracks = Array.from({ length: _frames.length });
      _tracks = _tracks.map((t, index) => getDefaultTrack(_frames, index));
    }
    timing = animation.timing || ((i) => i);
    repeat = animation.repeat ?? false;
    draw = typeof animation.draw === "function" ? animation.draw : null;

    animationEvents.initialDraw = true;
    draw && draw(_tracks, animationEvents);
    animationEvents.initialDraw = false;
  };

  let destroy = () => stop();

  let onAfterFrame = (track) => {
    track.frame.cycles++;
    if (track.frame.isAlternate) {
      track.frame._reverse = (track.frame.cycles + track.frame.isReverse) % 2;
    }
  };

  let setFrame = (track, index) => {
    track.frameIndex = index;
    track.startTime = 0;
    track.frame = track._frames[index];
  };

  let resetEvents = (track) => {
    animationEvents.initialDraw = false;
    animationEvents.animationStarted = false;
    track.trackStarted = false;
    track.frameStarted = false;
  };

  let step = (time) => {
    let continueAnimation = false;
    time -= pausedOffset;
    for (let track of _tracks) {
      if (track._trackComplete) continue;
      if (!track.startTime) track.startTime = time;
      track.elapsed = time - track.startTime;

      track._isAllComplete = true;
      track._repeatFrame = false;
      track._nextFrame = false;
    }

    draw(_tracks, animationEvents);

    for (let track of _tracks) {
      resetEvents(track);
      if (track._trackComplete) continue;

      if (track._repeatFrame) {
        onAfterFrame(track);
        setFrame(track, track.frameIndex);
        track.frameStarted = true;
        continueAnimation = true;
        continue;
      }
      if (track._nextFrame) {
        if (track.frameIndex + 1 < _frames[track.trackIndex].length) {
          onAfterFrame(track);
          setFrame(track, track.frameIndex + 1);
          track.frameStarted = true;
          continueAnimation = true;
          continue
        }
        if (repeat) {
          onAfterFrame(track);
          setFrame(track, 0);
          track.trackStarted = true;
          track.frameStarted = true;
          track.cycles++;
          // if (_isAlternate) {
          //   track.reverse = (track.cycles + _isReverse) % 2;
          // }
          continueAnimation = true;
        } else {
          track._trackComplete = true;
        }
      } else {
        continueAnimation = true;
      }
    }
    if (continueAnimation) reqId = requestAnimationFrame(step);
  };

  return {
    play,
    stop,
    pause,
    restart,
    set,
    destroy,
    steps,
    getRandomInt,
  };
}
