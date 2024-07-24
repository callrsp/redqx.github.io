---
layout: post
title:  "Analyze the elfloader coded by MikhailProg"
date:   2024-07-22 19:39:02 +0800
categories: [Linux] 
---















# project



https://github.com/MikhailProg/elf



# 初次分析

该项目的功能:  在内存中展开elf的内存镜像, 然后展开libc.so的内存镜像

用得到的libc.so去加载elf

所以本项目本身未主动的去加载elf, 算不上一个纯粹呃elf加载器





# 项目运行和调试

这东西搞了我半天,草!

同时借助GPT修改了一下makefile

环境: wsl+ vscode

项目文件结构

```
├── asset
│   └── ls
├── bin
│   ├── loader
│   ├── loader.id0
│   ├── loader.id1
│   ├── loader.id2
│   ├── loader.nam
│   └── loader.til
├── elf.code-workspace
├── obj
│   ├── amd64
│   │   ├── z_start.o
│   │   ├── z_syscall.o
│   │   └── z_trampo.o
│   ├── loader.o
│   ├── z_err.o
│   ├── z_printf.o
│   ├── z_syscalls.o
│   └── z_utils.o
└── src
    ├── aarch64
    │   ├── z_start.S
    │   ├── z_syscall.S
    │   └── z_trampo.S
    ├── amd64
    │   ├── z_start.o
    │   ├── z_start.S
    │   ├── z_syscall.o
    │   ├── z_syscall.S
    │   ├── z_trampo.o
    │   └── z_trampo.S
    ├── i386
    │   ├── z_start.S
    │   ├── z_syscall.S
    │   └── z_trampo.S
    ├── loader.c
    ├── Makefile
    ├── Makefile.bak
    ├── z_asm.h
    ├── z_elf.h
    ├── z_err.c
    ├── z_printf.c
    ├── z_syscalls.c
    ├── z_syscalls.h
    ├── z_utils.c
    └── z_utils.h
```



编译运行

```
┌──(kali㉿kali)-[~/code/src/project/elf/src]
└─$ make
gcc -pipe -Wall -Wextra -fPIC -fno-ident -fno-stack-protector -U _FORTIFY_SOURCE -DELFCLASS=ELFCLASS64 -fvisibility=hidden -Os -fno-asynchronous-unwind-tables -fno-unwind-tables -c loader.c -o ../obj/loader.o
gcc -pipe -Wall -Wextra -fPIC -fno-ident -fno-stack-protector -U _FORTIFY_SOURCE -DELFCLASS=ELFCLASS64 -fvisibility=hidden -Os -fno-asynchronous-unwind-tables -fno-unwind-tables -c z_err.c -o ../obj/z_err.o
gcc -pipe -Wall -Wextra -fPIC -fno-ident -fno-stack-protector -U _FORTIFY_SOURCE -DELFCLASS=ELFCLASS64 -fvisibility=hidden -Os -fno-asynchronous-unwind-tables -fno-unwind-tables -c z_printf.c -o ../obj/z_printf.o
gcc -pipe -Wall -Wextra -fPIC -fno-ident -fno-stack-protector -U _FORTIFY_SOURCE -DELFCLASS=ELFCLASS64 -fvisibility=hidden -Os -fno-asynchronous-unwind-tables -fno-unwind-tables -c z_syscalls.c -o ../obj/z_syscalls.o
gcc -pipe -Wall -Wextra -fPIC -fno-ident -fno-stack-protector -U _FORTIFY_SOURCE -DELFCLASS=ELFCLASS64 -fvisibility=hidden -Os -fno-asynchronous-unwind-tables -fno-unwind-tables -c z_utils.c -o ../obj/z_utils.o
gcc  -c amd64/z_start.S -o ../obj/amd64/z_start.o
gcc  -c amd64/z_syscall.S -o ../obj/amd64/z_syscall.o
gcc  -c amd64/z_trampo.S -o ../obj/amd64/z_trampo.o
gcc -nostartfiles -nodefaultlibs -nostdlib  -pie -e z_start -Wl,-Bsymbolic,--no-undefined,--build-id=none -s -o ../bin/loader ../obj/loader.o ../obj/z_err.o ../obj/z_printf.o ../obj/z_syscalls.o ../obj/z_utils.o ../obj/amd64/z_start.o ../obj/amd64/z_syscall.o ../obj/amd64/z_trampo.o
/usr/bin/ld: warning: ../obj/amd64/z_trampo.o: missing .note.GNU-stack section implies executable stack
/usr/bin/ld: NOTE: This behaviour is deprecated and will be removed in a future version of the linker

┌──(kali㉿kali)-[~/code/src/project/elf/src]
└─$ ../bin/loader ../asset/ls
aarch64  i386      Makefile      z_asm.h  z_err.c     z_syscalls.c  z_utils.c
amd64    loader.c  Makefile.bak  z_elf.h  z_printf.c  z_syscalls.h  z_utils.h
```



 







