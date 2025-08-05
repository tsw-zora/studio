import { type SVGProps } from 'react';

export function DoITLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12.5 5H18" />
      <path d="M6 12h12" />
      <path d="M12.5 19H18" />
      <path d="m3 5 3 3-3 3" />
      <path d="m3 12 3 3-3 3" />
    </svg>
  );
}
