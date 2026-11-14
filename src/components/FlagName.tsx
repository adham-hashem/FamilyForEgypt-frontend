import { Fragment, type ReactNode } from 'react';

const PHRASE = 'من أجل مصر';

/** «من أجل مصر» in the colors of the flag: red, white, black. Each word is outlined so it reads on any background. */
export function FlagName() {
  return (
    <span className="whitespace-nowrap">
      <span className="text-egypt-red">من</span> <span className="text-egypt-white">أجل</span>{' '}
      <span className="text-egypt-black">مصر</span>
    </span>
  );
}

/** Returns the text with every «من أجل مصر» in it drawn by FlagName. */
export function withFlagName(text: string): ReactNode {
  if (!text.includes(PHRASE)) return text;
  return text.split(PHRASE).map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <FlagName />}
      {part}
    </Fragment>
  ));
}
