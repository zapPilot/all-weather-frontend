export function waitForWrite(write, args, address) {
  if (write) {
    write({
      args,
      from: address,
    });
    return;
  }
  setTimeout(_waitForWrite, 3000);
}
