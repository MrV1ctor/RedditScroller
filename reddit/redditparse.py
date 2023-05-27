#create a new file called parsedSubreddits.txt


#open the file in write mode
file = open("Web/Random/reddit/nsfwparsedSubreddits.txt", "w")
#open the file in read mode
file2 = open("Web/Random/reddit/nsfwsubreddits.json", "r")
#iterate through each line in the file
for line in file2:
    #split the line by the / character
    #this will create an array with the subreddit name in the first position
    #and the rest of the url in the second position
    line = line.split('/r/')
    #write the subreddit name to the parsed file
    
    for i in line:
        #get the first word of i
        if (i.find(" ") != -1):
            file.write(i[0:i.find(" ")] + "\n")
        else:
            file.write(i + "\n")
#close the file
file.close()
#close the file
file2.close()