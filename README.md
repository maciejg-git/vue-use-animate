# vue-use-animate

vue-use-animate is a simple animation loop running on requestAnimationFrame.

## Usage

```javascript
import useAnimate from "vue-use-animate";

let animate = useAnimate();

animate.set({
  draw: ([track]) => {
    track.update();
    element.style.transform = translateX(track.progress, "px");
  },
  frames: [
    [
      { duration: 1000, timing: easing.easeInOutQuad, remap: [0, 200] }
    ]
  ],
});
```

To set up animation use set function. The function takes one argument that is an object with following properties:
- draw function, a function called on each step
- frames array, an array that defines frames of the animation
- additional properties that define animation direction, repeat and other (see examples below)

## Documentation and examples

[Documentation and examples](https://vue-use-animate.netlify.app)
