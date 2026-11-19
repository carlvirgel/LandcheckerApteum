import { MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/common/states'

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={<MapPin className="size-6" />}
      title="Page not found"
      description="The page you're looking for doesn't exist or has moved."
      action={
        <Link to="/" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
          Back to search
        </Link>
      }
    />
  )
}
