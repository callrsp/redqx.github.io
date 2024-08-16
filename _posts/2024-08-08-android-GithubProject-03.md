---
layout: post
title:  "dexparser项目分析"
date:   2024-08-08 00:00:00 +0800
categories: [android]    
---



# 序言

[dexparser](https://github.com/bunseokbot/dexparser)



>  加载apk:

从zip包读取所有dex文件,然后初始化成 DEXParser 对象,



> 加载dex

读取dex文件数据, 然后读取头部数据, 

```python
#字典, 直接从数据里面取    
self.header_data = { 
        'magic': self.data[0:8],
        'checksum': struct.unpack('<L', self.data[8:0xC])[0],
        'signiture': self.data[0xC:0x20],
        'file_size': struct.unpack('<L', self.data[0x20:0x24])[0],
        'header_size': struct.unpack('<L', self.data[0x24:0x28])[0],
        'endian_tag': struct.unpack('<L', self.data[0x28:0x2C])[0],
        'link_size': struct.unpack('<L', self.data[0x2C:0x30])[0],
        'link_off': struct.unpack('<L', self.data[0x30:0x34])[0],
        'map_off': struct.unpack('<L', self.data[0x34:0x38])[0],
        'string_ids_size': struct.unpack('<L', self.data[0x38:0x3C])[0],
        'string_ids_off': struct.unpack('<L', self.data[0x3C:0x40])[0],
        'type_ids_size': struct.unpack('<L', self.data[0x40:0x44])[0],
        'type_ids_off': struct.unpack('<L', self.data[0x44:0x48])[0],
        'proto_ids_size': struct.unpack('<L', self.data[0x48:0x4C])[0],
        'proto_ids_off': struct.unpack('<L', self.data[0x4C:0x50])[0],
        'field_ids_size': struct.unpack('<L', self.data[0x50:0x54])[0],
        'field_ids_off': struct.unpack('<L', self.data[0x54:0x58])[0],
        'method_ids_size': struct.unpack('<L', self.data[0x58:0x5C])[0],
        'method_ids_off': struct.unpack('<L', self.data[0x5C:0x60])[0],
        'class_defs_size': struct.unpack('<L', self.data[0x60:0x64])[0],
        'class_defs_off': struct.unpack('<L', self.data[0x64:0x68])[0],
        'data_size': struct.unpack('<L', self.data[0x68:0x6C])[0],
        'data_off': struct.unpack('<L', self.data[0x6C:0x70])[0]
    }
```

