import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILES } from '@/app/config'

export const validateFileType = (file: File): boolean => {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  return ACCEPTED_FILE_TYPES.includes(extension)
}

export const validateFileSize = (file: File): boolean => {
  return file.size <= MAX_FILE_SIZE_BYTES
}

export const isPDBFile = (fileName: string): boolean => {
  return fileName.toLowerCase().endsWith('.pdb')
}

export const validateFiles = (files: File[]): {
  validFiles: File[]
  invalidTypeFiles: File[]
  oversizedFiles: File[]
} => {
  const validFiles: File[] = []
  const invalidTypeFiles: File[] = []
  const oversizedFiles: File[] = []

  files.forEach(file => {
    if (!validateFileType(file)) {
      invalidTypeFiles.push(file)
    } else if (!validateFileSize(file)) {
      oversizedFiles.push(file)
    } else {
      validFiles.push(file)
    }
  })

  return { validFiles, invalidTypeFiles, oversizedFiles }
}

export const getFileValidationMessage = (
  invalidTypeCount: number,
  oversizedCount: number,
  exceedsMaxCount: number
): string => {
  const messages: string[] = []

  if (invalidTypeCount > 0) {
    messages.push(
      `${invalidTypeCount} file(s) have unsupported types. Supported: ${ACCEPTED_FILE_TYPES.join(', ')}`
    )
  }

  if (oversizedCount > 0) {
    messages.push(
      `${oversizedCount} file(s) exceed the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB size limit`
    )
  }

  if (exceedsMaxCount > 0) {
    messages.push(
      `Maximum ${MAX_FILES} files allowed. ${exceedsMaxCount} file(s) were not added`
    )
  }

  return messages.join('\n')
}
