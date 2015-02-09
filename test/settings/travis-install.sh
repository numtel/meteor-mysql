# MySQL is going to be run under this user
sudo rm -rf /var/ramfs/mysql/
sudo mkdir /var/ramfs/mysql/
sudo chown $USER /var/ramfs/mysql/
# --------------------------------------------

# Download and extract MySQL binaries
wget http://dev.mysql.com/get/Downloads/MySQL-5.5/mysql-5.5.41-linux2.6-x86_64.tar.gz
tar -zxf mysql-5.5.41-linux2.6-x86_64.tar.gz
cd mysql-5.5.41-linux2.6-x86_64/

mkdir -p data/mysql/data/tmp
# Initialize information database
./scripts/mysql_install_db --datadir=./data/mysql --user=$USER

# Copy configuration
cp ../test/settings/my.5.5.41.cnf ./my.cnf
mkdir binlog
touch binlog/mysql-bin.index

# Start server
./bin/mysqld --defaults-file=my.cnf &
sleep 4

cd ..

