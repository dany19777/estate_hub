'use client';

import type { AnchorHTMLAttributes, MouseEvent } from 'react';

type InternalLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
};

export function InternalLink({ href, onClick, ...props }: InternalLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    event.preventDefault();
    window.location.assign(href);
  };

  return <a href={href} onClick={handleClick} {...props} />;
}
