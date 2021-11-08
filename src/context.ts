export type Context = () => number;

interface IncrementOptions {
  maxValue: number;
  initialValue?: number;
  next?: Context;
}

export default ({
  next,
  maxValue,
  initialValue,
}: IncrementOptions): Context => {
  let context = initialValue || 0;
  return next || (() => {
    context = (context + 1) % maxValue;
    return context;
  });
}
