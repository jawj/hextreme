There aren't many big-endian platforms left, but we support them just in case. You can test like so using QuickJS on Debian:

* Go to https://people.debian.org/~gio/dqib/
* Download image for `powerpc-g3beige`, rename to add the `.zip` extension, and extract
* In the extracted folder:

```bash
brew install qemu  # or equivalent command for your Linux flavour

qemu-system-ppc \
  -machine 'g3beige' \
  -cpu 'g4' \
  -m 1G \
  -drive file=image.qcow2 \
  -device e1000,netdev=net \
  -netdev user,id=net,hostfwd=tcp::2222-:22 \
  -kernel kernel \
  -initrd initrd \
  -nographic \
  -append "root=LABEL=rootfs console=ttyPZ0"

# log in as root, password root

apt-get update
apt-get install -y quickjs git

git clone https://github.com/jawj/hextreme.git
cd hextreme/big-endian
./test-big-endian.sh
```
