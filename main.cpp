/*
 * FileName: main.cpp
 * Purpose: Solar System
 * Date: 2021-09-21
 * Author: Einsam
 * Copyright (C): 2021 All rights reserved
 */
#define STB_IMAGE_IMPLEMENTATION
#include <iostream>
#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <math.h>
#include "stb_image.h"

#include "./shader.h"

using namespace std;
void processInput(GLFWwindow* window);

const unsigned int SCR_WIDTH = 800;
const unsigned int SCR_HEIGHT = 600;
// square vertices.
float vertices[] = {
    // 位置              // 颜色            // 纹理坐标
     0.5f,  0.5f, 0.0f,  1.0f, 0.0f, 0.0f,   1.0f, 1.0f,// 右上
     0.5f, -0.5f, 0.0f,  0.0f, 1.0f, 0.0f,   1.0f, 0.0f,// 右下
     -0.5f,-0.5f, 0.0f,  0.0f, 0.0f, 1.0f,   0.0f, 0.0f,// 左下
     -0.5f, 0.5f, 0.0f,  1.0f, 1.0f, 0.0f,   0.0f, 1.0f,// 左上
};

unsigned int indices[] = {
    0, 1, 3,
    1, 2, 3,
};

int main(int argc, const char *argv[])
{
    // glfw: initialize and configure
    glfwInit();
    /* GLFW MAJOR Version = 3 Minor Version = 3 because of OpenGL version 3.3. */
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    // Core-profile 核心模式 No need for backward compatibility
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    // if using MacOS, please uncomment the following line
    // glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);

    // Open a window and create its context
    GLFWwindow* window = glfwCreateWindow(SCR_WIDTH, SCR_HEIGHT, "Solar System", NULL, NULL);
    if (window == NULL)
    {
        std::cout << "Failed to create GLFW window" << std::endl;
        glfwTerminate();
        return -1;
    }
    // Notify GLFW to set 'window' to the main context of the current thread.
    glfwMakeContextCurrent(window);
    //--------------------------------------------

    //--------------------------------------------
    // Initialize the GLAD.
    // GLAD is used to manage OpenGL function pointers.

    // 给GLAD传入用来加载系统相关的OpenGL函数指针地址的函数glfwGetProcAddress,根据编译的系统定义了正确的函数
    if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress))
    {
        std::cout << "Failed to initialize GLAD" << std::endl;
        return -1;
    }

    glViewport(0, 0, 800, 600);

    void framebuffer_size_callback(GLFWwindow* window, int width, int height);
    glfwSetFramebufferSizeCallback(window, framebuffer_size_callback);

    Shader ourShader("./shader.vs", "./shader.fs");

    // create VBO and bind buffer to  VBO
    // create VAO and bind VBO to VAO
    unsigned int VBO, VAO;
    // create EBO (index buffer object)
    unsigned int EBO;
    glGenVertexArrays(1, &VAO);
    glBindVertexArray(VAO);

    glGenBuffers(1, &VBO);
    glBindBuffer(GL_ARRAY_BUFFER, VBO);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

    // create EBO
    glGenBuffers(1, &EBO);
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
    //use glDrawElements instead to glDrawArrays
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);

    // create texture object
    unsigned int texture;
    glGenTextures(1, &texture);
    glBindTexture(GL_TEXTURE_2D, texture);

    // 为当前绑定的纹理对象设置环绕, 过滤方式
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
    // 放大与缩小时过滤方式
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);

    // load picture
    int width, height, nrChannels;
    // stbi_load use width, height, nrChannels of image
    unsigned char *data = stbi_load("container.jpg", &width, &height, &nrChannels, 0);

    // GL_TEXTURE_2D 生成与当前绑定的纹理对象在同一目标上的纹理
    // 第二个参数为纹理指定多级渐远纹理的级别
    // 第三个参数为把纹理存储为何种格式, RGB
    // 纹理宽度和高度
    if(data)
    {
      glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, width, height, 0, GL_RGB, GL_UNSIGNED_BYTE, data);
      glGenerateMipmap(GL_TEXTURE_2D);
    }
    else
    {
        std::cout << "Failed to load texture" << std::endl;
    }
    stbi_image_free(data);
    // location attributes
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 8*sizeof(float), (void*)0);
    glEnableVertexAttribArray(0);
    // color attributes
    glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 8*sizeof(float), (void*)(3 * sizeof(float)));
    glEnableVertexAttribArray(1);
    // texture attributes
    glVertexAttribPointer(2, 2, GL_FLOAT, GL_FALSE, 8*sizeof(float), (void*)(6 * sizeof(float)));
    glEnableVertexAttribArray(2);

    // Enable vertex attributes. Default disabled.
    glBindBuffer(GL_ARRAY_BUFFER, 0);
    // Bind location 0 to Vertex Array.
    glBindVertexArray(0);

    while(!glfwWindowShouldClose(window))
    {
        processInput(window);
        glClearColor(0.2f, 0.3f, 0.3f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        glBindTexture(GL_TEXTURE_2D, texture);
        //glPolygonMode(GL_FRONT_AND_BACK, GL_FILL);
        ourShader.use();

        glBindVertexArray(VAO);
        glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);

        glfwSwapBuffers(window);
        glfwPollEvents();
    }
    glfwTerminate();
    return 0;
}

// 窗口大小回调函数
void framebuffer_size_callback(GLFWwindow* window, int width, int height)
{
    glViewport(0, 0, width, height);
}

void processInput(GLFWwindow *window)
{
    if(glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS)
        glfwSetWindowShouldClose(window, true);
}
