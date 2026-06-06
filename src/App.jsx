import { SplitProvider, useSplit } from "./store/SplitProvider.jsx";
import CameraModal from "./components/CameraModal.jsx";
import StartStep from "./components/steps/StartStep.jsx";
import ReviewStep from "./components/steps/ReviewStep.jsx";
import PeopleStep from "./components/steps/PeopleStep.jsx";
import AssignStep from "./components/steps/AssignStep.jsx";
import ResultsStep from "./components/steps/ResultsStep.jsx";

const STEPS = {
  start: StartStep,
  review: ReviewStep,
  people: PeopleStep,
  assign: AssignStep,
  results: ResultsStep,
};

function Shell() {
  const { step, t } = useSplit();
  const Step = STEPS[step] || StartStep;
  return (
    <div className={`min-h-screen font-sans ${t.app}`}>
      <CameraModal />
      <div className="max-w-md mx-auto">
        <Step />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SplitProvider>
      <Shell />
    </SplitProvider>
  );
}
