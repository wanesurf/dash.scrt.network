import { faBars, faSun } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Footer from "shared/components/Footer";
import { KeplrPanel } from "shared/components/Keplr";
import { Navigation } from "shared/components/Navigation";
import { useState, createContext, useEffect, useContext } from "react";
import { Breakpoint } from "react-socks";
import { Flip, ToastContainer } from "react-toastify";
import { useLocation } from "react-router-dom";
import FloatingCTAButton from "shared/components/FloatingCTAButton";
import FeedbackButton from "shared/components/FeedbackButton";
import { ThemeContext } from "shared/components/ThemeContext";
import Tooltip from "@mui/material/Tooltip";

export const NavigationContext = createContext<boolean | null>(null);

export const DefaultLayout = ({ children }: any) => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  /**
   * Mobile Menu Handler
   */
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);

  // auto close menu
  const location = useLocation();
  useEffect(() => {
    if (showMobileMenu) {
      setShowMobileMenu(false);
    }
  }, [location]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024 && setShowMobileMenu) {
        setShowMobileMenu(false);
      }
    }
    window.addEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* Fixed Feedback Button */}
      <FeedbackButton url={"https://forms.gle/gxCqYzHwv7N4gx3G8"} />

      {/* Fixed Help Button */}
      <FloatingCTAButton
        url='https://linktr.ee/SCRTSupport'
        text='Need Help?'
      />

      <div className='flex'>
        {/* Menu */}
        <aside
          className={
            (showMobileMenu
              ? "z-50 left-0 right-0 w-full lg:w-auto min-h-screen "
              : "hidden lg:block") +
            " " +
            "lg:w-[17rem] fixed left-0 top-0 h-screen p-6 overflow-x-hidden bg-white dark:bg-neutral-800"
          }
        >
          <NavigationContext.Provider value={showMobileMenu}>
            <Navigation
              showMobileMenu={showMobileMenu}
              setShowMobileMenu={setShowMobileMenu}
            />
          </NavigationContext.Provider>
        </aside>
        <main className='flex flex-col min-h-screen flex-1 lg:ml-[17rem]'>
          <div className='flex-1'>
            {/* Top Bar [Burger Menu | Socials | Keplr] */}
            <div className='flex items-center gap-4 p-4'>
              {/* Burger Menu */}
              <div className='flex-initial lg:hidden'>
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className='text-black dark:text-white hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors'
                >
                  <FontAwesomeIcon icon={faBars} size='xl' />
                </button>
              </div>

              <div className='flex-initial sm:flex-1 text-right space-x-2'>
                {/* DarkMode / LightMode Switch */}
                <Tooltip
                  title={`Switch to ${
                    theme === "dark" ? "Light Mode" : "Dark Mode"
                  }`}
                  placement='bottom'
                  arrow
                >
                  <button
                    onClick={toggleTheme}
                    className='text-black dark:text-white hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors'
                  >
                    <FontAwesomeIcon icon={faSun} />
                  </button>
                </Tooltip>
              </div>

              <div className='flex-1 sm:flex-initial sm:flex sm:justify-end'>
                <KeplrPanel />
              </div>
            </div>

            {children}
          </div>
          <div className='max-w-7xl mx-auto mt-auto'>
            <Footer />
          </div>
        </main>
      </div>
      <Breakpoint medium up>
        <ToastContainer
          position='bottom-left'
          autoClose={5000}
          hideProgressBar
          newestOnTop={true}
          closeOnClick={true}
          rtl={false}
          pauseOnFocusLoss
          draggable={false}
          pauseOnHover={true}
          theme='dark'
        />
      </Breakpoint>
      <Breakpoint small down>
        <ToastContainer
          position={"bottom-left"}
          autoClose={false}
          hideProgressBar={true}
          closeOnClick={true}
          draggable={false}
          theme={"dark"}
          transition={Flip}
        />
      </Breakpoint>
    </>
  );
};

export default DefaultLayout;
