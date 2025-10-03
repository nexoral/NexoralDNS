import ConnectedDevices from '../../../components/ConnectedDevices';

export default function DevicesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Connected Devices</h1>
        <p className="text-gray-600 mt-2">Monitor all devices connected to your network</p>
      </div>
      <ConnectedDevices />
    </div>
  );
}

export const metadata = {
  title: 'Connected Devices - NexoralDNS',
  description: 'View all devices connected to your network'
};
