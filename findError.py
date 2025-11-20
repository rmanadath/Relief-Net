from pyspark import SparkContext

# Create a Spark context (entry point to Spark)
sc = SparkContext("local", "ErrorFinder")

# Read your log file
lines_rdd = sc.textFile("C:/Users/abbad/hadoop.log")

# Define a proper function (avoid lambda serialization issue on Windows)
def has_error_and_exception(line):
    return "ERROR" in line and "Exception" in line

# Filter lines that contain both "ERROR" and "Exception"
err_lines_rdd = lines_rdd.filter(has_error_and_exception)

# Count matching lines and print the first one
print("Number of matching lines:", err_lines_rdd.count())

# Safely get the first matching line if it exists
if not err_lines_rdd.isEmpty():
    print("First matching line:", err_lines_rdd.first())
else:
    print("No lines found containing both ERROR and Exception.")

# Stop the Spark context (clean up)
sc.stop()
