import Image from 'next/image'
import LoginForm from './_components/LoginForm'

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4 shadow-lg">
          <Image src="/logo_baznas.png" alt="BAZNAS" width={48} height={48} className="object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-white">QA Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Sign in to your account</p>
      </div>
      <LoginForm />
    </div>
  )
}
