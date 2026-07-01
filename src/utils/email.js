// Email obfuscation.
//
// The address is stored split and reversed so the literal "user@domain" string
// never appears in the source or the built JS bundle. Naive email harvesters
// scan static files for an `\S+@\S+\.\S+` pattern; there is nothing here for
// them to match. The real address is reassembled only at runtime, right before
// it is rendered / used in a mailto link.

const PARTS = {
  user: "ude.okilakleinad", // "danielkaliko.edu" reversed
  domain: "moc.liamg",      // "gmail.com" reversed
};

const rev = (s) => s.split("").reverse().join("");

/** The decoded email address, e.g. for display text. */
export function getEmail() {
  return `${rev(PARTS.user)}@${rev(PARTS.domain)}`;
}

/** The decoded address as a mailto: href. */
export function getMailtoHref() {
  return `mailto:${getEmail()}`;
}
