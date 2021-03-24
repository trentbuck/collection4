AC_INIT(collection, 4.0.0)
AC_CONFIG_SRCDIR(src/main.c)
AC_CONFIG_HEADERS(src/config.h)
AM_INIT_AUTOMAKE(dist-bzip2)
AC_LANG(C)

AC_PREFIX_DEFAULT("/opt/collection4")

#
# Check for programs/utilities
#
AC_PROG_CC
AC_PROG_CPP
AC_PROG_INSTALL
AC_PROG_LEX
AC_PROG_YACC
PKG_PROG_PKG_CONFIG
AM_CONDITIONAL(COMPILER_IS_GCC, test "x$GCC" = "xyes")

#
# Checks for header files.
#
AC_HEADER_STDC
AC_CHECK_HEADERS(stdbool.h sys/types.h sys/socket.h netdb.h)

PKG_CHECK_MODULES([rrd],  [librrd >= 1.6])
PKG_CHECK_MODULES([yajl], [yajl >= 2.0])
PKG_CHECK_MODULES([fcgi], [fcgi])

PKG_CHECK_MODULES([libcollectdclient], [libcollectdclient],
		  [with_libcollectdclient="yes"],
		  [with_libcollectdclient="no"])

AC_CONFIG_FILES([Makefile share/Makefile src/Makefile])
AC_OUTPUT()
