import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import Library from "./pages/Library";
import WeakWords from "./pages/WeakWords";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="practice" element={<Practice />} />
          <Route path="library" element={<Library />} />
          <Route path="weak-words" element={<WeakWords />} />
        </Route>
      </Routes>
    </Router>
  );
}
