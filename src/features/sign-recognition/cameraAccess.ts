let owner: symbol | null = null;

/** Keep ownership through an unresolved permission request so that a late stream can be stopped. */
export function claimCamera() {
  if (owner) return null;
  const token = Symbol();
  owner = token;
  let pending = true;
  let released = false;
  const unlock = () => {
    if (released && !pending && owner === token) owner = null;
  };
  return {
    settled() { pending = false; unlock(); },
    release() { released = true; unlock(); },
  };
}
