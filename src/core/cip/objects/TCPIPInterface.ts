import CIPMetaObject from '../object';
import CIPAttribute from '../attribute';
import { ClassCodes } from '../constants/index';
import { DataType } from '../datatypes/index';
import { getBits } from '../../../utils';

const ClassAttribute = Object.freeze({});

const IPAddressDataType = DataType.TRANSFORM(
  DataType.UDINT,
  (value: number) => `${value >>> 24}.${(value >>> 16) & 255}.${(value >>> 8) & 255}.${value & 255}`,
  (value: string) => {
    value.split('.').map(v => parseInt(v, 10)).reduce((accum, v, index) => {
      accum |= v << (8 * (3 - index));
      return accum;
    }, 0);
  }
);

const InterfaceConfigurationStatusDescriptions = {
  0: 'The Interface Configuration attribute has not been configured.',
  1: 'The Interface Configuration attribute contains valid configuration.',
};

const ConfigurationControlStartupConfiguration = {
  0: 'The device shall use the interface configuration values previously stored (for example, in non-volatile memory or via hardware switches, etc).',
  1: 'The device shall obtain its interface configuration values via BOOTP.',
  2: 'The device shall obtain its interface configuration values via DHCP upon start-up.',
};

const InstanceAttribute = Object.freeze({
  /** CIP Vol 2, 5-3.2.2.1 */
  Status: new CIPAttribute.Instance(1, 'Status', DataType.TRANSFORM(
    DataType.DWORD,
    (value) => {
      const interfaceConfigurationStatus = getBits(value, 0, 4);
      return [
        {
          name: 'Interface Configuration Status',
          value: interfaceConfigurationStatus,
          description: InterfaceConfigurationStatusDescriptions[interfaceConfigurationStatus] || 'Reserved',
        },
      ];
    },
  )),
  /** CIP Vol 2, 5-3.2.2.2 */
  ConfigurationCapability: new CIPAttribute.Instance(2, 'Configuration Capability', DataType.TRANSFORM(
    DataType.DWORD,
    (value) => {
      const BOOTPClient = getBits(value, 0, 1);
      const DNSClient = getBits(value, 1, 2);
      const DHCPClient = getBits(value, 2, 3);
      const DHCPDNSUpdate = getBits(value, 3, 4);
      const ConfigurationSettable = getBits(value, 4, 5);
      return [
        {
          name: 'BOOTP Client',
          description: `The device is ${!BOOTPClient ? 'not' : ''} capable of obtaining its network configuration via BOOTP.`,
          value: BOOTPClient,
        },
        {
          name: 'DNS Client',
          description: `The device is ${!DNSClient ? 'not' : ''} capable of resolving host names by querying a DNS server.`,
          value: DNSClient,
        },
        {
          name: 'DHCP Client',
          description: `The device is ${!DHCPClient ? 'not' : ''} capable of obtaining its network configuration via DHCP.`,
          value: DHCPClient,
        },
        {
          name: 'DHCP-DNS Update',
          description: `the device is ${!DHCPDNSUpdate ? 'not' : ''} capable of sending its host name in the DHCP request as documented in Internet draft <draft-ietf-dhc-dhcp-dns-12.txt>.`,
          value: DHCPDNSUpdate,
        },
        {
          name: 'Configuration Settable',
          description: `The Interface Configuration attribute is ${!ConfigurationSettable ? 'not' : ''} settable.`,
          value: ConfigurationSettable,
        },
      ];
    },
  )),
  /** CIP Vol 2, 5-3.2.2.3 */
  ConfigurationControl: new CIPAttribute.Instance(3, 'Configuration Control', DataType.TRANSFORM(
    DataType.DWORD,
    (value) => {
      const startupConfiguration = getBits(value, 0, 4);
      const DNSEnable = getBits(value, 4, 5);
      return [
        {
          name: 'Startup Configuration',
          description: ConfigurationControlStartupConfiguration[startupConfiguration] || 'Reserved',
          value: startupConfiguration,
        },
        {
          name: 'DNS Enable',
          description: `The device shall ${!DNSEnable ? 'not' : ''} resolve host names by querying a DNS server.`,
        },
      ];
    },
  )),
  PhysicalLinkObject: new CIPAttribute(4, 'Physical Link Object', DataType.TRANSFORM(
    DataType.STRUCT(
      [
        DataType.UINT,
        DataType.PLACEHOLDER((length) => DataType.EPATH(true, length)),
      ],
      (members, dt) => {
        if (members.length === 1) {
          return dt.resolve(2 * members[0]);
        }
        return undefined;
      },
    ),
    (value) => value[1],
  )),
  Configuration: new CIPAttribute.Instance(5, 'Configuration', DataType.STRUCT([
    IPAddressDataType, // IP Address
    IPAddressDataType, // Network Mask
    IPAddressDataType, // Gateway Address
    IPAddressDataType, // Primary Name Server
    IPAddressDataType, // Secondary Name Server
    DataType.STRING, // Default Domain Name
  ])),
  HostName: new CIPAttribute.Instance(6, 'Host Name', DataType.STRING),
});

const GetAttributesAllInstanceAttributes = Object.freeze([
  InstanceAttribute.Status,
  InstanceAttribute.ConfigurationCapability,
  InstanceAttribute.ConfigurationControl,
  InstanceAttribute.PhysicalLinkObject,
  InstanceAttribute.Configuration,
  InstanceAttribute.HostName,
]);

const CIPObject = CIPMetaObject(ClassCodes.TCPIPInterface, {
  ClassAttributes: ClassAttribute,
  InstanceAttributes: InstanceAttribute,
  GetAttributesAllInstanceAttributes,
});

class TCPIPInterface extends CIPObject {}

TCPIPInterface.ClassAttribute = ClassAttribute;
TCPIPInterface.InstanceAttribute = InstanceAttribute;

export default TCPIPInterface;
