import React from "react";
import { EditorialLink } from "./EditorialLink.jsx";
import { decryptEmail } from "../../utils/email.js";

/**
 * EmailLink — renders the contact email as a mailto link, decrypting it from
 * its AES-GCM ciphertext at runtime (see utils/email.js). Until the async
 * decrypt resolves (near-instant, cached per session) it shows a quiet, non-
 * address placeholder, so the real email only ever exists in the live DOM.
 */
export function EmailLink({ style }) {
  const [email, setEmail] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    decryptEmail().then((e) => { if (alive) setEmail(e); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!email) {
    return <span style={{ color: "var(--text-quiet)", ...style }}>email hidden</span>;
  }

  return (
    <EditorialLink href={`mailto:${email}`} style={style}>
      {email}
    </EditorialLink>
  );
}
