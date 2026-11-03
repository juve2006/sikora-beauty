import { Button } from '@payloadcms/ui';

// The way to `/canvas` beside the one to the store. Whoever sees the admin may open it, as `/canvas`
// answers staff only: a tab of its own, so an unsaved form stays.
const CanvasLink = () => (
  <Button
    buttonStyle="pill"
    el="anchor"
    margin={false}
    newTab
    size="small"
    url="/canvas"
  >
    Канвас
  </Button>
);

export default CanvasLink;
