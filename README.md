# vue-use-animate

vue-use-animate is a simple wrapper for `requestAnimationFrame`.

```javascript
import useAnimate from "./use-animate.js"

let animate = useAnimate()

animate.set({
  duration: 2000,
  timing: (time) => time * 100,
  draw: (progress) => element.style.width = progress + " %",
});

animate.play();
```

## Properties of the animate object

- `set`: defines animation 

```javascript
{
    duration: number,
    timing: function,
    draw: function,
}
```
`timing` function takes one argument that is the current progress of the animation in a range from `0` to `1`. You can use it to add additional effects like easing.

`draw` function that should modify the style property of the animating element.

- `play`: plays animation
- `stop`: stop animation
- `pause`: pauses animation. Resume it by calling play.
- `destroy`: stops and cancels any pending `requestAnimationFrame` (it simply calls stop)
