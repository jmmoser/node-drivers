export default ({ next, maxValue, initialValue, }) => {
    let context = initialValue || 0;
    return next || (() => {
        context = (context + 1) % maxValue;
        return context;
    });
};
