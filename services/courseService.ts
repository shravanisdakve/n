import { type Course } from '../types';

// Mock database with localStorage persistence
const getMockCourses = (): Course[] => {
    try {
        const courses = localStorage.getItem('mockCourses');
        if (courses) {
            return JSON.parse(courses);
        } else {
            const defaultCourses: Course[] = [
                { id: 'mock_course_1', name: 'Introduction to AI', color: '#8b5cf6' },
                { id: 'mock_course_2', name: 'Data Structures', color: '#3b82f6' },
                { id: 'mock_course_3', name: 'Web Development', color: '#10b981' },
            ];
            setMockCourses(defaultCourses);
            return defaultCourses;
        }
    } catch (error) {
        console.error("Error reading courses from localStorage", error);
        return [];
    }
};

const setMockCourses = (courses: Course[]) => {
    try {
        localStorage.setItem('mockCourses', JSON.stringify(courses));
    } catch (error) {
        console.error("Error saving courses to localStorage", error);
    }
};

const generateColor = (existingColors: string[] = []): string => {
    const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    const availableColors = colors.filter(c => !existingColors.includes(c));
    return availableColors.length > 0 ? availableColors[0] : colors[Math.floor(Math.random() * colors.length)];
}

export const getCourses = async (): Promise<Course[]> => {
    console.log("Fetching courses from mock service...");
    return Promise.resolve(getMockCourses());
};

export const getCourse = async (id: string): Promise<Course | null> => {
    console.log("Fetching course from mock service:", id);
    const mockCourses = getMockCourses();
    const course = mockCourses.find(c => c.id === id);
    return Promise.resolve(course || null);
};

export const addCourse = async (name: string): Promise<Course | null> => {
    console.log("Adding course to mock service:", name);
    const mockCourses = getMockCourses();
    const existingColors = mockCourses.map(c => c.color);
    const newCourse: Course = {
        id: `mock_course_${Date.now()}`,
        name,
        color: generateColor(existingColors),
    };
    const updatedCourses = [...mockCourses, newCourse];
    setMockCourses(updatedCourses);
    console.log("Added course to mock service:", newCourse);
    return Promise.resolve(newCourse);
};

export const deleteCourse = async (id: string): Promise<void> => {
    console.log("Deleting course from mock service:", id);
    const mockCourses = getMockCourses();
    const updatedCourses = mockCourses.filter(c => c.id !== id);
    setMockCourses(updatedCourses);
    console.log("Deleted course from mock service:", id);
    return Promise.resolve();
};
