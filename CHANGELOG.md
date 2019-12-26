# Changelog

## 2.0.0-beta.5 (???)
- CIP added decoding for data types ENGUNIT
- CIP added encoding for data types ENGUNIT
- Improved EIP Layer listIdentities timeout handling, it should be much faster to resolve

## 2.0.0-beta.4 (2019-12-23)
- Logix5000 can read program symbols, returns an object with all scoped symbols
- Logix5000 can now read program scoped symbols
- Logix5000 can now determine size of single-dimension arrays and reads the entire array if elements is not specified (multidimensional array read support coming soon)
- Logix5000 added readTemplateClassAttributes
- UDP layer now receives default port 44818 from upper EIP layer if user or previous layer does not specify port
- CIP added decoding for data types LREAL, LWORD, and LTIME, STRINGN, STRINGI STRUCT (formal encoding), EPATH, ARRAY
- CIP added encoding for data types USINT, BYTE, LWORD, LREAL, STRING, SHORT_STRING, STRING2, EPATH, ARRAY, ABBREV_ARRAY, STRUCT
- CIP Connection Slot can now be a number, a string, or a buffer
- CIP Identity added Device Type Names
- CIP Connection/ConnectionManager now supports LargeForwardOpen (connection size greater than 511 bytes), automatically falls back to regular ForwardOpen if device does not support LargeForwardOpen

## 2.0.0-beta.3 (2019-12-7)
- `Logix5000.readTag()` now reads the entire array if the tag is a 1-dimensional array
  - It is still possible to only return one element or a slice of the array by specifying the `elements` argument and/or including the accessed element in the tagname. Here are some examples:
    - Return the first two elements
      ```javascript
      await logix.readTag('tagname', 2);
      ```
    - Return the fourth element
      ```javascript
      await logix.readTag('tagname[3]');
      ```
    - Return the second through the third element
      ```javascript
      await logix.readTag('tagname[1]', 2);
      ```
- Layers can now specify default options and pass them to lower layers
  - TCP layer now receives default port 44818 from upper EIP layer if user or previous layer does not specify port
  - TCP layer now receives default port 502 from upper Modbus layer if user or previous layer does not specify port
- TCP layer's options argument can now just be a host string if an upper layer specifies a port in the default options (EIP and Modbus layer)
  - Before:
    ```javascript
    const tcpLayer = new TCP({ host: '1.2.3.4', port: 44818 });
    ```
  - After:
    ```javascript
    const tcpLayer = new TCP('1.2.3.4');
    ```
- Fixed `PCCCLayer.typedWrite()` type/data parameter encoding
- `PCCCLayer.typedRead()` added `items` parameter, allows reading multiple items
  - Examples:
  ```javascript
  await plc5.typedRead('N7:0', 6); // Read the first 6 elements from integer file 7
  await plc5.typedRead('F8:44', 20); // Read elements 44 through 63 from float file 8
  ```
- CIP added encoding and decoding for 8 byte integer (LINT) and unsigned integer (ULINT)
- `Logix5000.readTagAttributesAll()` added ArrayDimensionLengths
- Logix5000 fixed error descriptions



## 2.0.0-beta.2 (2019-12-6)
- Logix5000 CAN NOW READ STRUCTURES 🔥
- TCP layer automatically handles reconnects
- Logix5000 listTags now accepts a scope (e.g. Program:SymbolName)
- Logix5000 added data types Program, Map, Routine, Task, Cxn
- Removed `Logix5000.readTagFragmented()`, it is now called automatically when needed
- Added `PCCCLayer.echo()`
- CIP ConnectionManager can now send unconnected messages - API still a work in progress


## 2.0.0-beta.1 (2019-11-15)
### Added
  - Logix5000.readControllerAttributes
      - reads the 0xAC class instance attributes in the controller
      - Use to determine when the tags list and/or structure information has changed
  - Logix5000.readTagAttributesList
  - Logix5000.readTagAttributesAll
### Changed
  - Logix5000.readTag now accepts a tag name string, a symbol instance id, or a tag object for the tag argument
### Fixed
  - Logix5000 error description handling


## 2.0.0-beta.0 (2019-11-14)
### Added
  - Modbus layer - one layer for all Modbus frame formats
    - TCP, RTU (future), and ASCII (future)
### Removed
  - ModbusTCP layer has been removed, use Modbus layer instead
### Changed
  - Logix5000.listTags
      - now returns an async iterator
      - structure tags now include template information
  - src structure has been simplified

## 1.5.4 / 2019-05-10
  - Added CIP.Connection disconnect timeout of 10000 milliseconds
## 1.5.3 / 2019-05-06
  - CIP Decode returns true or false for boolean data type
## 1.5.2 / 2019-05-06
  - Layer contextCallback added timeout parameter
  - CIP.Logix5000 listTags added options parameter, allowed fields:
    - timeout - timeout in milliseconds, will return tags instead of timeout error if at least one response received with tags (default 10000)
## 1.5.1 / 2019-04-12
  - CIP.Logix5000 allows reading multiple elements from tags
    - e.g. logix.readTag('tagname', 2)
    - resolves an array of values if number is greater than 1
## 1.5.0 / 2019-04-12
  - CIP.Logix5000 no longer requires including CIP.Connection as a lower layer.
  - CIP.Connection only connects if needed
    - e.g. getting all attributes of identity object does not require a connection