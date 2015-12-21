backup-daemon
===
A realtime differential backup daemon in nodejs.

## Installation
`npm install backup-daemon -g`

## Usage
#### Local backup
```
# Create a realtime backup of Pictures into PicturesBackup:
backup-daemon Pictures/ PicturesBackup/

# Create a realtime backup of the file important.txt into important-backup.txt
backup-daemon important.txt important-backup.txt
```
#### Remote backup
For remove backup, a valid ssh destination have to be provided. In order to avoid the prompt asking
for your password in every synchronization, you can create a passphraseless SSH key and copy it into
your remote machine, this process is described in the section *generate a SSH key*.
```
# Create a realtime backup of Pictures into Pictures in a different machine using ssh
backup-daemon ~/Pictures/ pi@192.168.1.27:/home/pi/Pictures/
```
## Generate a SSH key
This is an optional step to remove the password prompt asking for your password in remote backup.
```
# Leave all fields empty
$ ssh-keygen -t rsa -b 2048

$ ssh-copy-id user@server
```