import { useEffect, useState } from 'react';
import { isStorageAvailable } from '../../save/idbRepository';

export function StorageBanner({
  check = () => isStorageAvailable(),
}: {
  check?: () => Promise<boolean>;
}) {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    let live = true;
    void check().then((ok) => {
      if (live) setBlocked(!ok);
    });
    return () => {
      live = false;
    };
  }, [check]);
  if (!blocked) return null;
  return (
    <p className="storage-banner" role="alert">
      Progress can't be saved here. Use Export in the pause menu.
    </p>
  );
}
