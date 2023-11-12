# vue-use-animate

vue-use-animate is a simple wrapper for `requestAnimationFrame`.

- play, stop, pause and restart animations
- specify duration and delay of the animations
- support for easing functions
- specify single animation or an array of the animations that have different settings but run in the same `requestAnimationFrame`

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
})
```

`duration` is the duration of the animation in miliseconds. If this property is an `array`, the first element is the delay and the second element is the `duration` of the animation.

`timing` function takes one argument that is the current progress of the animation in a range from `0` to `1`. You can use it to add additional effects like easing.

`draw` function takes one argument that is the value returned from `timing` function. This value is used to modify the style property of the animated element.

- `play`: plays animation
- `stop`: stop animation
- `pause`: pauses animation. Resume it by calling play.
- `destroy`: stops and cancels any pending `requestAnimationFrame` (it simply calls stop)
