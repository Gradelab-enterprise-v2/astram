
import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Initial check
    checkMobile()
    
    // Listen for resize events
    window.addEventListener("resize", checkMobile)
    
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return isMobile
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean>(false)

  React.useEffect(() => {
    const checkTablet = () => {
      setIsTablet(window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < TABLET_BREAKPOINT)
    }
    
    // Initial check
    checkTablet()
    
    // Listen for resize events
    window.addEventListener("resize", checkTablet)
    
    return () => window.removeEventListener("resize", checkTablet)
  }, [])

  return isTablet
}

export function useDeviceType() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  
  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet
  }
}
