check=$(grep 'android.intent.action.MAIN' $1)
if [ $? -eq 0 ]
	then
	# Reverse the file
	# Find the main activity by finding android.intent.action.MAIN
	# cut for main activity package
	sed '1!G;h;$!d' $1 | sed -n -e '/android.intent.action.MAIN/,/<activity/ p' | sed -n '1!p' |
	grep -m 1 "android:name" |
	cut -f2- -d"=" | 
	cut -f2 -d'"' | 
	cut -f2 -d"'" 
else
	exit 1
fi
