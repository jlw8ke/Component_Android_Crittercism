check=$(grep 'android.intent.action.MAIN' $1)
if [ $? -eq 0 ]
	then
sed -n -e '/<activity/,/android.intent.action.MAIN/ p' $1 | 
	grep -m 1 "android:name" | 
	cut -f2- -d"=" | 
	cut -f2 -d'"' | 
	cut -f2 -d"'"
else
	exit 1
fi