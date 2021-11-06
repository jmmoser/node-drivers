export type ContextGenerator = () => number;

interface IncrementOptions {
  maxValue: number;
  initialValue?: number;
  next?: ContextGenerator;
}

export default ({
  next,
  maxValue,
  initialValue,
}: IncrementOptions): ContextGenerator => {
  let context = initialValue || 0;
  return next || (() => {
    context = (context + 1) % maxValue;
    return context;
  });
}
