export function isMobileSubPage(pathname: string): boolean {
  return pathname.split("/").filter(Boolean).length > 2;
}
