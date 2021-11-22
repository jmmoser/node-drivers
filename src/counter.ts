export type Counter = () => number;

interface IncrementOptions {
  maxValue: number;
  initialValue?: number;
  next?: Counter;
}

export default ({
  next,
  maxValue,
  initialValue,
}: IncrementOptions): Counter => {
  let context = initialValue || 0;
  return next || (() => {
    context = (context + 1) % maxValue;
    return context;
  });
}
