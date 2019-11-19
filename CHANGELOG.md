# Changelog

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