import { UPLOAD_ENDPOINT } from '@/app/config'
import { FormData as FormDataType } from '@/components/form/StepTwo'

export interface SubmissionData {
  files: File[]
  numberOfRuns: number
  formData: FormDataType
}

export interface SubmissionResponse {
  job_ids: string[]
  message?: string
}

export class SubmissionService {
  static async submit(data: SubmissionData): Promise<SubmissionResponse> {
    const formData = new FormData()
    
    // Add all files
    data.files.forEach(file => {
      formData.append('zipfiles', file)
    })
    
    // Add form fields
    formData.append('name', data.formData.fullName)
    formData.append('email', data.formData.email)
    formData.append('organization', data.formData.organization)
    formData.append('description', data.formData.description)
    formData.append('numberOfRuns', data.numberOfRuns.toString())
    
    try {
      const response = await fetch(UPLOAD_ENDPOINT, {
        method: 'POST',
        body: formData,
        // FormData will automatically set the correct Content-Type with boundary
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server responded with ${response.status}: ${errorText}`)
      }
      
      const responseData: SubmissionResponse = await response.json()
      return responseData
    } catch (error: any) {
      // Handle network errors
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Connection to the server failed. Please ensure the backend server is running on port 8000.')
      }
      throw error
    }
  }
}
