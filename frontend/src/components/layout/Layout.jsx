import Navbar from './Navbar';
import Footer from './Footer';

// ============================================================
// Layout principal — wraps toutes les pages publiques
// ============================================================

const Layout = ({ children, fullWidth = false }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className={`flex-1 ${fullWidth ? '' : 'bg-neutral-100'}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
