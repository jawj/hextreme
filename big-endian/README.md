There aren't many big-endian platforms left, but we support them just in case. You can test like so using QuickJS on Debian:

```bash
brew install qemu  # or equivalent command for your Linux flavour
```

* Go to https://people.debian.org/~gio/dqib/
* Download image for `s390x-virt`, rename to add the `.zip` extension, and extract
* In the extracted folder, run the `qemu-system-s390x` command provided in `readme.txt`.
* Log in as `root`, password `root`, then:

```bash
apt-get update
apt-get install -y quickjs git ca-certificates

git clone https://github.com/jawj/hextreme.git
cd hextreme/big-endian
./test-big-endian.sh
```
