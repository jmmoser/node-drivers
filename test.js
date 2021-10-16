let i = 0;
function consumer() {
  i -= 1;
}

consumer();
consumer();
consumer();
console.log(i);
