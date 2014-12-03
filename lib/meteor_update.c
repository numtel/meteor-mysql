/*
numtel:mysql
MIT License, ben@latenightsketches.com
lib/meteor_update.c

User Defined Function (UDF) to broadcast database updates back to Meteor.

Install dependency (on Ubuntu):
sudo apt-get install libmysqlclient-dev

Compile:
gcc $(mysql_config --cflags) -shared -fPIC -o meteor_update.so lib/meteor_update.c

Install:
sudo cp meteor_update.so $(mysql_config --plugindir)

Use connection.initUpdateServer() instead of initUpdateTable()

*/

#ifdef STANDARD
/* STANDARD is defined, don't use any mysql functions */
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#ifdef __WIN__
typedef unsigned __int64 ulonglong; /* Microsofts 64 bit types */
typedef __int64 longlong;
#else
typedef unsigned long long ulonglong;
typedef long long longlong;
#endif /*__WIN__*/
#else
#include <my_global.h>
#include <my_sys.h>
#if defined(MYSQL_SERVER)
#include <m_string.h>   /* To get strmov() */
#else
/* when compiled as standalone */
#include <string.h>
#define strmov(a,b) stpcpy(a,b)
#define bzero(a,b) memset(a,0,b)
#endif
#endif
#include <mysql.h>
#include <ctype.h>

#ifdef HAVE_DLOPEN

#ifdef __WIN__
#include <winsock2.h>
#else
#include <sys/socket.h>
#include <sys/types.h>
#include <netinet/in.h>
#include <netdb.h>
#endif

my_bool meteor_update_init(UDF_INIT *initid, UDF_ARGS *args, char *message);
void meteor_update_deinit(UDF_INIT *initid);
char *meteor_update(UDF_INIT *initid, UDF_ARGS *args, char *result,
       unsigned long *length, char *null_value, char *error);


my_bool meteor_update_init(UDF_INIT *initid, UDF_ARGS *args, char *message)
{
  if (args->arg_count != 1 || args->arg_type[0] != STRING_RESULT)
  {
    strmov(message,"Wrong arguments to lookup;  Use the source");
    return 1;
  }
  initid->max_length=11;
  initid->maybe_null=1;
  return 0;
}

void meteor_update_deinit(UDF_INIT *initid __attribute__((unused)))
{
}

char *meteor_update(UDF_INIT *initid __attribute__((unused)), UDF_ARGS *args,
             char *result, unsigned long *res_length, char *null_value,
             char *error __attribute__((unused)))
{
  uint length;
  char msg_buffer[256];
  struct hostent *hostent;
  int sockfd, portno, n;
  struct sockaddr_in serv_addr;
  struct hostent *server;

  if (!args->args[0] || !(length=args->lengths[0]))
  {
    *null_value=1;
    return 0;
  }
  if (length >= sizeof(msg_buffer))
    length=sizeof(msg_buffer)-1;
  memcpy(msg_buffer,args->args[0],length);
  msg_buffer[length]=0;

  portno = 9801;
  sockfd = socket(AF_INET, SOCK_STREAM, 0);
  if (sockfd < 0) 
  {
    *null_value=1;
    return 0;
  }
  server = gethostbyname("localhost");
  if (server == NULL)
  {
    *null_value=1;
    return 0;
  }
  bzero((char *) &serv_addr, sizeof(serv_addr));
  serv_addr.sin_family = AF_INET;
  bcopy((char *)server->h_addr, 
       (char *)&serv_addr.sin_addr.s_addr,
       server->h_length);
  serv_addr.sin_port = htons(portno);
  if (connect(sockfd,(struct sockaddr *) &serv_addr,sizeof(serv_addr)) < 0) 
  {
    *null_value=1;
    return 0;
  }
  n = write(sockfd,msg_buffer,strlen(msg_buffer));
  close(sockfd);
  
  return result;
}

#endif
