# vue-use-animate

vue-use-animate is a simple wrapper for `requestAnimationFrame`.

- play, stop, pause and restart animations
- specify duration and delay of the animations
- support for easing functions
- repeat animations number of times or continuously
- reverse, alternate and alternate-reverse mode
- remap default `0` to `1` range of progess to any range
- play single animation or an array of the animations that have different settings but run in the same `requestAnimationFrame`

```javascript
import useAnimate from "./use-animate.js"

let animate = useAnimate()

animate.set({
  duration: 2000,
  timing: (timeFraction) => timeFraction * 100,
  draw: (progress) => element.style.width = progress + " %",
});

animate.play();
```

## Properties of the animate object

- `set`: defines animation 

```javascript
animate.set({
  duration: number | array,
  timing: function,
  draw: function,
  repeat?: boolean | number,
  direction?: string,
  remap?: array,
})
```

- `play`: plays animation
- `stop`: stop animation
- `pause`: pauses animation. Resume it by calling play.
- `destroy`: stops and cancels any pending `requestAnimationFrame` (it simply calls stop)

## Setting new animation

Object provided in `animate.set()` have following properties:

`duration` is the duration of the animation in miliseconds. If this property is an `array`, the first element is the delay and the second element is the `duration` of the animation.

`timing` function takes one argument that is the current progress of the animation in a range from `0` to `1`. You can use it to add additional effects like easing.

`draw` function takes one argument that is the value returned from `timing` function. This value is used to modify the style property of the animated element.

`repeat`: specifies the number of times an animation should repeat. If true animation will play continuously. Required for `alternate` and `alternate-reverse`. Default: `false`.

`direction`: one of `normal`, `reverse`, `alternate` or `alternate-reverse`. Default: `normal`.

`remap` is an two element array that defines final min and max values of the progress. The default is a range from `0` to `1`.

