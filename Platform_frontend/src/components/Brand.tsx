import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
function Brand() {
  return <Link to="/" className="brand"><span className="brand-icon"><GraduationCap size={21} /></span><span><b>EduSphere</b><small>PLATFORM ADMINISTRATION</small></span></Link>;
}
export default Brand;
