import WaybillForm from '@/components/admin/waybill-form';
import { waybillsEnabled } from '@/lib/novaposhta';

// On the server: only it knows whether the branch parcels leave from is set.
const WaybillField = () => <WaybillForm enabled={waybillsEnabled()} />;

export default WaybillField;
