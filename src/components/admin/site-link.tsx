import { Button } from '@payloadcms/ui';

// The way back to the store, in the admin's top bar, as its menu may be collapsed: a tab of its own,
// so an unsaved form stays.
const SiteLink = () => (
  <Button
    buttonStyle="pill"
    el="anchor"
    margin={false}
    newTab
    size="small"
    url="/"
  >
    На сайт
  </Button>
);

export default SiteLink;
