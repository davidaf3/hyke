export async function fetchExample(filename: string): Promise<string> {
    const response = await fetch(
        `https://raw.githubusercontent.com/davidaf3/hyke/master/examples/${filename}`
    );
    return await response.text();
}