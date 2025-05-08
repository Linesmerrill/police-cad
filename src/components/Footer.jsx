export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t py-6 mt-16">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
        <p>
          &copy; {new Date().getFullYear()} Lines Police CAD. All rights
          reserved.
        </p>
        <div className="flex space-x-4 mt-4 md:mt-0">
          <a href="/terms" className="hover:text-blue-600">
            Terms
          </a>
          <a href="/privacy" className="hover:text-blue-600">
            Privacy
          </a>
          <a href="/contact" className="hover:text-blue-600">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
