#include "Material.h"

//Material::~Material()
//{
//}

Material::Material(Shader * _shader, glm::vec3 _diffuse, glm::vec3 _specular, glm::vec3 _ambient, float _shiness) :
	shader(_shader),
	diffuse(_diffuse),
	specular(_specular),
	ambient(_ambient),
	shiness(_shiness)
{
}
