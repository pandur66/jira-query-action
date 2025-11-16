export const csvToStringArray = (csv?: string): string[] => {
  return csv ? csv.split(",").map((item) => item.trim()) : []
}

export const csvToNumberArray = (csv?: string): number[] => {
  return csv ? csv.split(",").map((item) => parseInt(item.trim(), 10)) : []
}

export const stringToBool = (value?: string, defaultValue: boolean = false): boolean => {
  return value === undefined ? defaultValue : value.toLowerCase() === "true"
}

export const stringToNumber = (value?: string, defaultValue: number = 0): number => {
  return value === undefined ? defaultValue : parseInt(value, 10)
}

export const stringArrayToCsv = (arr: string[]): string => {
  return arr.join(", ")
}
